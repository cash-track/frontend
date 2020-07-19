import { expect } from 'chai'
import { shallowMount } from '@vue/test-utils'
import Login from '@/components/Auth/Login.vue'

describe('Login.vue', () => {
  it('renders login form', () => {
    const wrapper = shallowMount(Login, {})

    expect(wrapper.contains('button[type=submit]'))
  })
})
